import axios from "axios";
import React, { useContext, useState } from "react";
import { UserContext } from "../../context/UserContext";

const RegisterAndLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  const register = async (e) => {
    e.preventDefault();

    const url = isLoginOrRegister === 'register' ? '/register' : '/login'
    const { data } = await axios.post(url, { username, password });
    setLoggedInUsername(username);
    setId(data.id);
  };

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form className="w-64 mx-auto" onSubmit={register}>
        <input
          className="p-2 rounded-sm block w-full mb-2 border"
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="p-2 rounded-sm block w-full mb-2 border"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="p-2 rounded-sm block w-full bg-blue-500 text-white">
          {isLoginOrRegister === "register" ? "Register" : "Login"}
        </button>
        {isLoginOrRegister === "register" && (
          <div className="w-full mt-2 text-center">
            Already a member?
            <button
              onClick={() => setIsLoginOrRegister("login")}
              className="underline underline-offset-2"
            >
              Login here
            </button>
          </div>
        )}
        {isLoginOrRegister === "login" && (
          <div className="w-full mt-2 text-center">
            Don't have an account? 
            <button
              onClick={() => setIsLoginOrRegister("register")}
              className="underline underline-offset-2"
            >
              Register
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default RegisterAndLogin;