export function findRectangles(binaryImage){
    // Deep clone the input binary image to avoid modifying the original matrix.
    const image = binaryImage.map(row => row.slice());
  
    // Initialize an array to store the resulting rectangular boxes.
    const boxes = [];
  
    // Helper function to traverse and mark a rectangular region.
    function markRegion(row, col, endRow, endCol) {
      for (let i = row; i <= endRow; i++) {
        for (let j = col; j <= endCol; j++) {
          image[i][j] = 0;
        }
      }
    }
  
    // Iterate over the binary image to find rectangular regions.
    for (let row = 0; row < image.length; row++) {
      for (let col = 0; col < image[row].length; col++) {
        if (image[row][col] === 1) {
          let endRow = row;
          let endCol = col;
  
          // Find the extent of the rectangular region.
          while (endRow + 1 < image.length && image[endRow + 1][col] === 1) {
            endRow++;
          }
          while (endCol + 1 < image[row].length && image[row][endCol + 1] === 1) {
            endCol++;
          }
  
          // Mark the region as visited.
          markRegion(row, col, endRow, endCol);
  
          // Calculate the area of the region.
          const area = (endRow - row + 1) * (endCol - col + 1);
  
          // Add the region to the list of boxes.
          boxes.push({
            startRow: row,
            startCol: col,
            endRow: endRow,
            endCol: endCol,
            area: area
          });
        }
      }
    }
  
    // Sort the boxes by area in number of pixels.
    boxes.sort((a, b) => b.area - a.area);
  
    return boxes;
  }

test();
export function rectanglesToImage(rectangles, width, height){
    let image = new Array(height).fill(0).map(() => new Array(width).fill(0));
    for (let i = 0; i < rectangles.length; i++) {
        let box = rectangles[i];
        for (let row = box.startRow; row <= box.endRow; row++) {
            for (let col = box.startCol; col <= box.endCol; col++) {
                image[row][col] = 1;
            }
        }
    }
    return image;
}

function test(){
    let image = [[1, 1, 1, 0, 0, 0],
                 [1, 1, 1, 0, 0, 0],
                 [1, 1, 1, 0, 0, 0],
                 [0, 0, 0, 1, 1, 1],]   
    let rectangles = findRectangles(image);
    console.log(rectangles);
    let image2 = rectanglesToImage(rectangles, 6, 4);
    console.log(image2);
}
