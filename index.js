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
  "https://www.drpciv.ro/drpciv-booking-api/getAvailableDaysForSpecificService/1/";

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




appointmentChecker();
//------------------BOT COMMANDS------------------

bot.on("message", async (msg) => {
  console.log(msg);
  const message = msg.text;
  const chatId = msg.chat.id;
  if (message === "/start") {
    //---------------------------------------- Start

    await subsLayer.getUser(msg.chat.id).then(async (user) => {
      if (user) {
        console.log(`User ${msg.chat.id} already exists in db`);
        current_date = await getDateDRPCIV(user.judetId);
        bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
        bot.sendMessage(
          chatId,
          "Botul deja ruleaza! (" + judete[user.judetId - 1].nume + ")"
        );
      } else {
        bot.sendMessage(chatId, "Salut! 👋");
        bot.sendMessage(chatId, "Alege judetul 🇷🇴", options1);
      }
    });
  } else if (message === "/help") {
    //---------------------------------------- Help ⁉
    bot.sendMessage(
      chatId,
      "Comenzile disponibile sunt: /start, /stop, /help, /date"
    );
  } else if (message === "/date") {
    //---------------------------------------- Date 📆⏳
    await subsLayer.getUser(chatId).then(async (user) => {
      judet_id = user.judetId;
      let data = await getDateDRPCIV(user.judetId);
      bot.sendMessage(chatId, "*" + data + "*", {
        parse_mode: "Markdown",
      });
    });
  } else if (message === "/stop") {
    //---------------------------------------- Stop ⛔️
    await subsLayer.deleteUser(msg.chat.id).then(() => {
      bot.sendMessage(chatId, "Botul a fost oprit");
    });
  } else {
    //---------------------------------------- Invalid command ♿️🚫
    bot.sendMessage(
      chatId,
      "Se pare ca acest mesaj nu este o comanda valida. Incearca /help."
    );
  }

  //dupa toate huinelele...

  if (current_date != "") {
    // appointmentChecker(msg);
  }
});

// Option callback
bot.on("callback_query", async (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    judet_id = action;
    console.log(judet_id);
    bot.sendMessage(chatId, `Ai ales judetul ${judete[judet_id - 1].nume}`);

    //optional
    current_date = await getDateDRPCIV(judet_id);
    bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
    //-----
    bot.deleteMessage(chatId, messageId);
    subsLayer
      .addUser(callbackQuery.message.chat, current_date, judet_id)
      .then(() => console.log("newUser"));
    bot.sendMessage(
      chatId,
      "Hey, o sa va anuntam despre programarile disponibile la DRPCIV"
    );
  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, `Eroare: ${err}`);
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

async function getDateDRPCIV(judetId) {
  let first_date = "";
  return new Promise((resolve) => {
    axios
      .get(BASE_URL + judetId)
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
