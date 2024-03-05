const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  recipient: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  text: String,
  file: String,
}, {timestamps: true});

//Export the model
module.exports = mongoose.model("Message", messageSchema);
