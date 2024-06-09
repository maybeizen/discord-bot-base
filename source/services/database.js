const color = require("chalk");
const msg = require("../config/messages.json");
const mongoose = require("mongoose");
const data = require("../config/database.json");
const process = require("node:process");
const startTime = Date.now();
const connectionString = data.mongodb.connectionString;

if (
  !connectionString ||
  connectionString === "" ||
  connectionString === "Enter a connection string here"
) {
  console.log(color.yellow(msg.noDatabaseConnectionString));
  return;
} else {
  (async () => {
    try {
      await mongoose.connect(connectionString);
      const connectionTime = Date.now() - startTime;

      console.log(
        color.green(msg.databaseConnected.replace("{time}", connectionTime))
      );
    } catch (error) {
      console.error(color.red(msg.databaseError));
      console.log(
        c.gray("Terminating process node process to ensure database integrity.")
      );
      process.exit(1);
    }
  })();
}
