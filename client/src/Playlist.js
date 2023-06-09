import React from "react";
import { db } from "./firebase.js";
import { useLocalStorage } from "usehooks-ts";
import {collection,doc,setDoc,getDoc,getDocs,query} from "firebase/firestore";

const Playlist = ({postChangeCounter}) => {

    const [user, setUser] = useLocalStorage("user", null);
    const [loops, setLoops] = React.useState([]);

    let userId = user.uid

    React.useEffect(() => {
        const getUserLoops = async () => {
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
            )
            setLoops(newLoops)
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


    return <div>
        <h1>Playlist</h1>
        <div style={{ display: "flex", flexDirection: "column"}}>
            {loops.length}
            {loops.map((loop) => 
                <div key={loop.id}>
                    <h2>{loop.title}</h2>
                    <h3>{loop.bpm}</h3>
                </div>
        )}
        </div>
    </div>
    }

export default Playlist;