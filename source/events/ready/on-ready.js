const color = require("chalk");
const msg = require("../../config/messages.json");

module.exports = (client) => {
  console.log(
    color.green(msg.ready).replace("${bot_name}", client.user.username)
  );
};
