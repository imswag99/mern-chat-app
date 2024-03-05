import React from "react";
import axios from 'axios';
import { UserContextProvider } from "../context/UserContext";
import Routes from "./pages/Routes";

function App() {
  axios.defaults.baseURL = "https://mern-chat-app-5syy.onrender.com/";
  axios.defaults.withCredentials = true;


  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  )
}

export default App
