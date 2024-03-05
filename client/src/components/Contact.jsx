import React from "react";
import Avatar from "./Avatar";

const Contact = ({id, username, selected, onClick, online}) => {
  return (
    <div
      onClick={() => onClick(id)}
      className={
        "py-2 pl-4 flex gap-2 items-center cursor-pointer" +
        (selected
          ? " bg-blue-50 border-l-[0.2rem] border-blue-500"
          : " border-b border-gray-100")
      }
    >
      <Avatar online={online} userName={username} userId={id} />
      <span className="text-gray-800">{username}</span>
    </div>
  );
};

export default Contact;
