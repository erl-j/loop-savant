import React from "react";
import { db } from "./firebase.js";
import { useLocalStorage } from "usehooks-ts";
import {collection,doc,setDoc,getDoc,getDocs,query,deleteDoc} from "firebase/firestore";
import {RollPreview} from "./RollView.js";

const Playlist = ({postChangeCounter, setPostChangeCounter, setLoop, nPitches, nTimesteps, scale}) => {

    const [user, setUser] = useLocalStorage("user", null);
    const [loops, setLoops] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);

    let userId = user.uid

    const deleteLoop = async (loop) => {
        // remove loop from db
        // loop is part of user's loops collection
        const docRef = doc(db, "users", userId, "loops", loop.id);
        await deleteDoc(docRef);
        setPostChangeCounter(postChangeCounter + 1)
        console.log("deleted")
    }


    React.useEffect(() => {
        const getUserLoops = async () => {
            setIsLoading(true);
            // get user ref
            const docRef = doc(db, "users", userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                console.log("Document data:", docSnap.data());
            } else {
                // doc.data() will be undefined in this case
                console.log("No such document!");
            }
            // get user loops
            const q = query(collection(db, "users", userId, "loops"));
            const querySnapshot = await getDocs(q);
            let newLoops = querySnapshot.docs.map((doc) => {
                console.log(doc.id, " => ", doc.data());
                // add id to loop object
                let data = doc.data()
                data.id = doc.id
                return data
            }
            );

            // sort loops by createdAt
            newLoops.sort((a, b) => {
                return b.createdAt.seconds - a.createdAt.seconds
            })

            setLoops(newLoops)
            setIsLoading(false);
        }
        getUserLoops()
    }, [postChangeCounter])

    React.useEffect(() => {
        const getUsername = async () => {
            const docRef = doc(db, "users", userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                console.log("Document data:", docSnap.data());
            } else {
                // doc.data() will be undefined in this case
                console.log("No such document!");
            }
        }
        getUsername()
    }, [])

    const mask = new Array(nPitches * nTimesteps).fill(1)

    return <div>
        <h1>Playlist</h1>
       { isLoading ? <div>loading...</div> :
        <div style={{ display: "flex", flexDirection: "column"}}>
            {loops.length}
            {loops.map((loop) => 
                <div key={loop.id}>
                    <h2>{loop.title}</h2>
                    <h3>{loop.bpm}</h3>
                    <div>
                    <button onClick={() => setLoop(loop)}>load</button>
                    <button onClick={() => deleteLoop(loop)}>delete</button>
                    <RollPreview nPitches={nPitches} scale={scale} nTimeSteps={nTimesteps} roll={loop.roll}></RollPreview>
                    </div>
                </div>
        )}
        </div>}
    </div>
    }

export default Playlist;