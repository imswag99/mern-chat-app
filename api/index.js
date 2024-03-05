const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const ws = require("ws");
const User = require("./models/userModel");
const Message = require("./models/messageModel");
const fs = require('fs');

dotenv.config();
mongoose
  .connect(process.env.MONGO_URL)
  .then((result) => console.log("Connected to DB successfully"));

const jwtsecret = process.env.JWT_SECRET;

const app = express();
app.use(express.json());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(
  cors({
    credentials: true,
    origin: "https://mern-chat-app-eight-beige.vercel.app/",
  })
);
app.use(cookieParser());

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtsecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
}

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;

  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 });

  res.json(messages);
});

app.get("/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtsecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("no token provided");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      const passOk = await bcrypt.compare(password, user.password);
      if (passOk) {
        jwt.sign(
          { userId: user._id, userName: user.username },
          jwtsecret,
          {},
          (err, token) => {
            if (err) throw err;
            res
              .cookie("token", token, {
                sameSite: "none",
                secure: true,
              })
              .status(201)
              .json({
                id: user._id,
              });
          }
        );
      }
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

app.post("/logout", async (req, res) => {
  res
    .cookie("token", "", {
      sameSite: "none",
      secure: true,
    })
    .json('ok');
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    jwt.sign(
      { userId: newUser._id, userName: newUser.username },
      jwtsecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, {
            sameSite: "none",
            secure: true,
          })
          .status(201)
          .json({
            id: newUser._id,
          });
      }
    );
  } catch (error) {
    res.status(500).json(error);
  }
});

const server = app.listen(4040);

const wss = new ws.WebSocketServer({ server });
wss.on("connection", (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            userName: c.userName,
          })),
        })
      );
    });
  }

  // pinging the user every 5 seconds
  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log("dead");
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  // read username and id from the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtsecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, userName } = userData;
          connection.userId = userId;
          connection.userName = userName;
        });
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData;
    let filename = null;
    if(file) {
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1];
      filename = Date.now() + '.' + ext;
      const path = __dirname + '/uploads/' + filename;
      const bufferData = Buffer.from(file.data.split(',')[1], 'base64');

      fs.writeFile(path, bufferData, () => {
        console.log('file saved: ' + path);
      })
    }

    if(recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null
      });

      [...wss.clients]
      .filter((c) => c.userId === recipient)
      .forEach((c) =>
        c.send(
          JSON.stringify({
            text,
            file : file ? filename : null,
            sender: connection.userId,
            recipient,
            _id: messageDoc._id,
          })
        )
      );
    }
  });

  // notify everyone about online people (when someone connects)
  notifyAboutOnlinePeople();
});
