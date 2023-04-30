import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
//fauna db
import { SubscriptionLayer } from "./faunadb.js";

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const subsLayer = new SubscriptionLayer();

const judete = JSON.parse(fs.readFileSync("./judete.json", "utf8"));
let judet_id = 0;
let current_date = "";

bot.setMyCommands([
  { command: "/start", description: "Start 🚀" },
  { command: "/stop", description: "Stop ⛔️" },
  { command: "/help", description: "Ajutor ⁉" },
  { command: "/date", description: "Urmatoarea data disponibila 📆⏳" },
]);

const options1 = {
  reply_markup: JSON.stringify({
    inline_keyboard: judete.map((judet) => {
      return [{ text: judet.nume, callback_data: judet.id }];
    }),
  }),
};

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
        current_date = await subsLayer.getDateDRPCIV(user.judetId);
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
      if (user) {
        let data = await subsLayer.getDateDRPCIV(user.judetId);
        bot.sendMessage(chatId, "*" + data + "*", {
          parse_mode: "Markdown",
        });
      } else {
        bot.sendMessage(chatId, "Nu sunteți abonat la notificări! \nFolosiți /start pentru a vă abona.");
      }
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
    current_date = await subsLayer.getDateDRPCIV(judet_id);
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



