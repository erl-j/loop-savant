import * as React from 'react';
// now import firebase ui
import * as firebaseui from 'firebaseui'
import "firebaseui/dist/firebaseui.css"
import firebase from "firebase/compat/app";
import firebaseApp from './firebase';
import {auth} from './firebase';
import { useLocalStorage } from 'usehooks-ts'

const Auth = () => {

    const [user, setUser] = useLocalStorage("user", null);

    React.useEffect(() => {
        const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
        ui.start('#firebaseui-auth-container', {
            signInOptions: [
                {
                    provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
                    requireDisplayName: false
                },
            ],
            callbacks: {
                signInSuccessWithAuthResult: function (authResult, redirectUrl) {
                    setUser(authResult.user);
                    return true;
                },
            },
            signInFlow: 'popup',
            // signInSuccessUrl: '/welcome',
            privacyPolicyUrl: '/privacy',
    }
        )
    }, []);

    return (
        <div id="firebaseui-auth-container"></div>
    )
}

export default Auth;