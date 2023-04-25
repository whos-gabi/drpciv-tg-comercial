import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
//fauna db
import { SubscriptionLayer } from "./faunadb.js";

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const subsLayer = new SubscriptionLayer();

const BASE_URL =
  "https://www.drpciv.ro/drpciv-booking-api/getAvailableDaysForSpecificService/1/27/";

const months = [
  "",
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

let timer = null;
let current_date = "";

bot.setMyCommands([
  { command: "/start", description: "Start 🚀" },
  { command: "/stop", description: "Stop ⛔️" },
  { command: "/help", description: "Ajutor ⁉" },
  { command: "/date", description: "Urmatoarea data disponibila 📆⏳" },
]);

// let users = [];
subsLayer.getAllUsers().then((users) => {
  console.log(`Resubscribed ${users.length} users`);
  if (users.length > 0) {
    users.forEach((user) => {
      console.log(`User chat id: ${user.data.chat.id}`);
      appointmentChecker(user.data);
    });
  }
});

//------------------BOT COMMANDS------------------

bot.on("message", async (msg) => {
  console.log(msg);
  const message = msg.text;
  const chatId = msg.chat.id;
  if (message === "/start") {
    //---------------------------------------- Start
    clearInterval(timer);
    timer = null;
    current_date = "";
    
    //sterge nahui toti userii
    await subsLayer.getAllUsers().then((users) => {
      if (users.length > 0) {
        subsLayer
          .deleteAllUsers()
          .then((resp) => {
            console.log(`Deleted ${resp.length} users.`)
            subsLayer.addUser(msg).then(() => console.log("newUser"));
          });
      } else {
        subsLayer.addUser(msg).then(() => console.log("newUser"));
      }
    });

    console.log(msg.text); //test
    bot.sendMessage(
      chatId,
      "Hey, o sa va anuntam despre programarile disponibile la DRPCIV"
    );
    current_date = await getDateDRPCIV(msg);
    bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
    appointmentChecker(msg);
    console.log(`Data curenta este: ${current_date}`);
  } else if (message === "/help") {
    //---------------------------------------- Help ⁉
    bot.sendMessage(
      chatId,
      "Comenzile disponibile sunt: /start, /stop, /help, /date"
    );
  } else if (message === "/date") {
    //---------------------------------------- Date 📆⏳
    let data = await getDateDRPCIV();
    bot.sendMessage(chatId, "*" + data + "*", {
      parse_mode: "Markdown",
    });
    console.log("/date: " + data);
  } else if (message === "/stop") {
    //---------------------------------------- Stop ⛔️
    clearInterval(timer);
    timer = null;
    current_date = "";
    //sterge nahui toti userii
    subsLayer
      .deleteAllUsers()
      .then((deletedUsers) =>
        console.log(`Deleted ${deletedUsers.length} users.`)
      );
    bot.sendMessage(chatId, "Botul a fost oprit");
  } else {
    //---------------------------------------- Invalid command ♿️🚫
    bot.sendMessage(
      chatId,
      "Se pare ca acest mesaj nu este o comanda valida. Incearca /help."
    );
  }

  //dupa toate huinelele...

  if (current_date != "") {
    appointmentChecker(msg);
  }
});

//--------------------FUNCTIONS----------------------

function appointmentChecker(message) {
  console.log("✅ checking for appointments...");
  timer = setInterval(async () => {
    let date = await getDateDRPCIV(message);
    if (date !== current_date) {
      console.log("new date found: " + date);
      current_date = date;
      bot.sendMessage(
        message.chat.id,
        `${date} este noua data disponibila la DRPCIV `
      );
    }
  }, 60 * 1000 * 1); // 1 min
}

async function getDateDRPCIV() {
  let first_date = "";
  return new Promise((resolve) => {
    axios
      .get(BASE_URL)
      .then((data) => {
        first_date = data.data[0].split(" ")[0];
        first_date = first_date.split("-");
        first_date =
          first_date[2] +
          " " +
          months[parseInt(first_date[1])] +
          " " +
          first_date[0];
        setTimeout(() => {
          resolve(String(first_date));
        }, 500);
      })
      .catch((error) => {
        console.log(error);
      });
  });
}
