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
  { command: "/judet", description: "Schimbă Județul ⚙️" },
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
        // await subsLayer.stopUser(msg.chat.id, false);
        if (user.archived) {
          bot.sendMessage(
            chatId,
            "Abonamentul dvs. a expirat.😥\nPentru a continua sa primiti notificari, va rugam sa achitati abonamentul"
          );
        } else {
          console.log(`User ${msg.chat.id} already exists in db`);
          current_date = await subsLayer.getDateDRPCIV(user.judetId);
          bot.sendMessage(
            chatId,
            "Botul deja ruleaza! (" + judete[user.judetId - 1].nume + ")"
          );
          bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
        }
      } else {
        bot.sendMessage(chatId, "Salut! 👋");
        bot.sendMessage(chatId, "Alege judetul 🇷🇴", options1);
      }
    });
  } else if (message === "/help") {
    //---------------------------------------- Help ⁉
    bot.sendMessage(
      chatId,
      "Comenzile disponibile sunt: /start, /stop, /judet, /help, /date\n Pentru mai multe întrebări, contactați @whos_gabi"
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
        bot.sendMessage(
          chatId,
          "Nu sunteți abonat la notificări! \nFolosiți /start pentru a vă abona."
        );
      }
    });
  } else if (message === "/judet") {
    //---------------------------------------- Date 📆⏳
    await subsLayer.getUser(chatId).then(async (user) => {
      if (user) {
        if(!user.archived){
          bot.sendMessage(chatId, "Schimbă judetul 🇷🇴", options1);
        }else{
          bot.sendMessage(chatId, "Abonamentul dvs. a expirat.😥\nPentru a continua sa primiti notificari, va rugam sa achitati abonamentul");
        }
      } else {
        bot.sendMessage(
          chatId,
          "Nu sunteți abonat la notificări! \nFolosiți /start pentru a vă abona."
        );
      }
    });
  } else if (message === "/stop") {
    //---------------------------------------- Stop ⛔️
    await subsLayer.archiveUser(msg.chat.id, true).then(async () => {
      bot.sendMessage(chatId, "Botul a fost oprit");
      await subsLayer.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `User archived:\n\n${JSON.stringify(msg, null, 2)}`
      );
    });

    //---------------------------------------- ADMIN COMMANDS
  } else if (message === "/users" && chatId == process.env.ADMIN_CHAT_ID) {
    //---------------------------------------- Users 🦀
    await subsLayer.getAllUsers().then((users) => {
      users.forEach((user) => {
        bot.sendMessage(
          chatId,
          `User: ${JSON.stringify(user.data.chat, null, 2)}\nJudet: ${
            judete[user.data.judetId - 1].nume
          }\nArchived: ${user.data.archived}\nSubscribed: ${
            user.data.subscribed
          }\nFreeTrial:\n ${JSON.stringify(user.data.freetrial, null, 2)}\n`
        );
      });
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
  const message = callbackQuery.message.text;
  try {
    judet_id = action;
    // console.log(judet_id);
    bot.sendMessage(chatId, `Ai ales judetul ${judete[judet_id - 1].nume}`);

    //optional
    current_date = await subsLayer.getDateDRPCIV(judet_id);
    bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
    //-----

    if (message === "Alege judetul 🇷🇴") {
      bot.deleteMessage(chatId, messageId);
      subsLayer
        .addUser(callbackQuery.message.chat, current_date, judet_id)
        .then(async (user) => {
          bot.sendMessage(
            chatId,
            "Hey, o să te anunțăm despre programările disponibile la DRPCIV"
          );
          await subsLayer.sendMessage(
            process.env.ADMIN_CHAT_ID,
            `New user subscribed: ${chatId} Judet: ${
              judete[judet_id - 1].nume
            }\n\n${JSON.stringify(user, null, 2)}`
          );
        });
    } else if (message === "Schimbă judetul 🇷🇴") {
      bot.deleteMessage(chatId, messageId);
      await subsLayer.updateUserLastDate(chatId, current_date);
      subsLayer.updateUserJudetID(chatId, judet_id).then(async (user) => {
        bot.sendMessage(
          chatId,
          "Te țin la curent cu programările disponibile la DRPCIV"
        );
        await subsLayer.sendMessage(
          process.env.ADMIN_CHAT_ID,
          `User: ${chatId} changed to Judet: ${judete[judet_id - 1].nume}`
        );
      });
    }
  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, `Eroare: ${err}`);
  }
});

//--------------------FUNCTIONS----------------------
