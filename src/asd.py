
      mask_ratio = torch.mean(mask,dim=[1,2])
      step = int(self.inverse_schedule(mask_ratio)*n_sampling_steps)

      # Inference algo from https://arxiv.org/pdf/2202.04200.pdf
      with torch.no_grad():

          for step in range(step,n_sampling_steps):

              y,_ = self(x,mask)

              y = einops.rearrange(y,'b p t c -> b (p t) c')

              y[:,:,0] += activity_bias

              probs = torch.softmax(y/temperature,dim=-1)

              # n tokens to mask
              n_mask = int(np.floor(self.schedule((step+1)/n_sampling_steps).cpu()*self.n_pitches * self.n_timesteps))

              # sample from probs
              sampled_indices = torch.distributions.Categorical(probs=probs).sample()

              # turn indices into one-hot
              sample = torch.zeros_like(probs)
              sample.scatter_(-1,sampled_indices[...,None],1)

              assert torch.all(torch.sum(sample,dim=-1) == 1)

              # confidence of indices (unmasked indices have confidence 1)
              confidences = torch.sum(sample * probs,axis=-1)

              flat_mask = einops.rearrange(mask,'b p t c -> b (p t) c')

              confidences = confidences * flat_mask[...,0] + (1-flat_mask[...,0])

              # get confidence of n_mask:th lowest confidence
              confidence_threshold = torch.sort(confidences,dim=-1)[0][:,n_mask]

              flat_x = einops.rearrange(x,'b p t c -> b (p t) c')

              if True:
                  fig,ax = plt.subplots(1,6,figsize=(15,5))
                  ax[0].imshow(flat_x[0,:,0].cpu().reshape(self.n_pitches,self.n_timesteps),vmin=0,vmax=1)
                  ax[0].set_title("x on")

                  ax[1].imshow(flat_x[0,:,1].cpu().reshape(self.n_pitches,self.n_timesteps),vmin=0,vmax=1)
                  ax[1].set_title("x off")

                  ax[2].imshow(flat_mask[0,:,0].cpu().reshape(self.n_pitches,self.n_timesteps),vmin=0,vmax=1)
                  ax[2].set_title("mask")

                  ax[3].imshow(probs[0,:,0].cpu().reshape(self.n_pitches,self.n_timesteps),vmin=0,vmax=1)
                  ax[3].set_title(f"probs of on at step {step}")

                  ax[4].imshow(sample[0,:,0].cpu().reshape(self.n_pitches,self.n_timesteps),vmin=0,vmax=1)
                  ax[4].set_title(f"sample of on at step {step}")

                  ax[5].imshow(confidences[0].cpu().reshape(self.n_pitches,self.n_timesteps),vmin=0,vmax=1)
                  ax[5].set_title(f"confidences at step {step}")

                  plt.show()

              # get sample 
              sample = flat_mask * sample + (1-flat_mask) * flat_x

              if use_confidence_sampling:
                  new_mask = (confidences <  confidence_threshold[...,None])[...,None].float()
              else:
                  new_mask = flat_mask

                  # get number of masked tokens
                  n_current_mask = int(torch.sum(new_mask))

                  # get indices that are currently masked
                  masked_indices = torch.where(flat_mask[...,0] == 1)[1]

                  n_to_unmask = n_current_mask-n_mask

                  # get n_mask random indices
                  random_indices = torch.randperm(masked_indices.shape[0])[:n_to_unmask]

                  # get indices to unmask
                  unmask_indices = masked_indices[random_indices]

                  # unmask
                  new_mask[:,unmask_indices,:] = 0



              flat_x = flat_x*new_mask + (1-new_mask) * sample

              assert torch.all(torch.sum(x,axis=-1) == 1)

              flat_mask = new_mask
              mask = einops.rearrange(flat_mask,'b (p t) c -> b p t c',p=self.n_pitches,t=self.n_timesteps)
              x = einops.rearrange(flat_x,'b (p t) c -> b p t c',p=self.n_pitches,t=self.n_timesteps)
