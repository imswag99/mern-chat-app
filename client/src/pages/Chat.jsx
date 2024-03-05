import React, { useContext, useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";
import { IoMdChatbubbles } from "react-icons/io";
import { FaUser } from "react-icons/fa6";
import { ImAttachment } from "react-icons/im";
import { UserContext } from "../../context/UserContext";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "../components/Contact";

const Chat = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { id, username, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  useEffect(() => {
    connectToWs();
  }, []);

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behaviour: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUser) {
      axios.get("/messages/" + selectedUser).then(({ data }) => {
        setMessages(data);
      });
    }
  }, [selectedUser]);

  useEffect(() => {
    axios.get("/people").then(({ data }) => {
      const offlinePeopleArr = data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));

      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p.username;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected. Trying to reconnect.");
        connectToWs();
      }, 1000);
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, userName }) => {
      people[userId] = userName;
    });
    setOnlinePeople(people);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if(messageData.sender === selectedUser) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  }

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messageWithoutDupes = uniqBy(messages, "_id");

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  function sendMessage(e, file = null) {
    if (e) e.preventDefault();

    ws.send(
      JSON.stringify({
        recipient: selectedUser,
        text: newMessageText,
        file,
      })
    );

    if (file) {
      axios.get("/messages/" + selectedUser).then(({ data }) => {
        setMessages(data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUser,
          _id: Date.now(),
        },
      ]);
    }
  }

  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <div className="text-blue-600 font-bold flex gap-2 p-4">
            <IoMdChatbubbles size={25} />
            MernChat
          </div>
          {Object.keys(onlinePeopleExclOurUser).map((userId, i) => (
            <Contact
              key={i}
              id={userId}
              online={true}
              username={onlinePeopleExclOurUser[userId]}
              onClick={() => setSelectedUser(userId)}
              selected={userId === selectedUser}
            />
          ))}
          {Object.keys(offlinePeople).map((userId, i) => (
            <Contact
              key={i}
              id={userId}
              online={false}
              username={offlinePeople[userId]}
              onClick={() => setSelectedUser(userId)}
              selected={userId === selectedUser}
            />
          ))}
        </div>
        <div className="p-2 flex justify-center items-center">
          <span className="mr-3 text-sm text-gray-600 flex gap-1 items-center">
            <FaUser />
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm bg-blue-100 py-1 px-2 text-gray-500 rounded-sm border"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="bg-blue-50 flex flex-col w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUser && (
            <div className="flex h-full items-center justify-center">
              <div className="text-gray-400">
                select a conversation to start chatting
              </div>
            </div>
          )}
          {!!selectedUser && (
            <div className="h-full relative">
              <div className="overflow-y-scroll absolute inset-0">
                {messageWithoutDupes.map((message, i) => (
                  <div
                    key={i}
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      className={
                        "inline-block text-left text-sm p-2 my-4 rounded-md " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {message.text}
                      {message.file && (
                        <div>
                          <a
                            target="_blank"
                            className="border-b flex gap-1 items-center"
                            href={axios.defaults.baseURL + "/uploads/" + message.file}
                          >
                            <ImAttachment size={15} />
                            {message.file}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUser && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <label
              type="button"
              className="text-gray-600 bg-blue-200 p-2 cursor-pointer rounded-sm border border-blue-200"
            >
              <input type="file" className="hidden" onChange={sendFile} />
              <ImAttachment size={20} />
            </label>
            <input
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              type="text"
              className="bg-white flex-grow border p-2 rounded-sm"
              placeholder="Type your message here"
            />
            <button
              type="submit"
              className="text-white bg-blue-500 p-2 rounded-sm"
            >
              <IoSend size={25} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
