require("dotenv").config();
const {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  Events,
} = require("discord.js");
const { token, clientId } = require("./config/tokens.json"); // Set your token/clientId in /source/config/tokens.json
const { guildId } = require("./config/guild.json");
const fs = require("node:fs");
const path = require("node:path");
const color = require("chalk");
const eventsDir = path.join(__dirname, "events");
const eventFolders = fs.readdirSync(eventsDir);
const serviceDir = path.resolve(`source/services`);
const serviceFiles = fs
  .readdirSync(serviceDir)
  .filter((file) => file.endsWith(".js"));
const msg = require("./config/messages.json");

// Define client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
});

// Add commands to client
client.commands = new Collection();
const commands = fs
  .readdirSync("source/commands")
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const command = require(`./commands/${file}`);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(color.green(`Registered command: "${command.data.name}"`));

      return command.data;
    } else {
      console.log(
        color.yellow(
          `Skipping command "${file}"! Missing a required "data" or "execute" property.`
        )
      );

      return null;
    }
  })
  .filter((command) => command !== null);

// Event Handler Function
const eventHandler = (eventDir, eventName) => {
  const eventFiles = fs
    .readdirSync(eventDir)
    .filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    try {
      const handler = require(path.join(eventDir, file));
      client.on(eventName, (...args) => {
        try {
          handler(client, ...args);
        } catch (handlerError) {
          console.error(
            color.red(`Error handling event "${file}": ${handlerError}`)
          );
        }
      });
    } catch (requireError) {
      console.error(
        color.red(`Error requiring event "${file}": ${requireError}`)
      );
    }
  }
};

// Event Handling
for (const folder of eventFolders) {
  const eventDir = path.join(eventsDir, folder);
  if (fs.lstatSync(eventDir).isDirectory()) {
    eventHandler(eventDir, folder);
  }
}

// Service Handler
console.log(color.green(msg.runningServices));
for (const file of serviceFiles) {
  try {
    const service = require(`./services/${file}`);
    if (service.init) {
      service.init(client);
    }
  } catch (error) {
    console.error(color.red(`Error running service "${file}": ${error}`));
  }
}

// Slash Command Interaction Handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(
      color.red(`No command matching ${interaction.commandName} was found.`)
    );
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(
      color.red(`Error executing "${interaction.commandName}": ${error}`)
    );
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle("Interaction Error")
            .setDescription(
              `An internal interaction error has occurred! Please try again later`
            )
            .setColor("Red"),
        ],
      });
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Interaction Error")
            .setDescription(
              `An internal interaction error has occurred! Please try again later`
            )
            .setColor("Red"),
        ],
      });
    }
  }
});

// Register commands to guild
client.once("ready", () => {
  const rest = new REST({ version: "10" }).setToken(token);

  rest
    .put(Routes.applicationCommands(clientId, guildId), {
      body: commands,
    })
    .then(() => {
      if (commands.length === 0) {
        console.log(color.yellow("No commands to register. Skipping..."));
      } else {
        console.log(
          color.green(
            `Successfully registered ${commands.length} application command(s).`
          )
        );
      }
    })
    .catch((error) =>
      console.error(
        color.red(`Error registering application command(s): ${error}`)
      )
    );
});

client
  .login(token)
  .catch((error) =>
    console.error(color.red(`Error logging into client: ${error}`))
  );
