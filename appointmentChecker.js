import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

import { SubscriptionLayer } from "./faunadb.js";
const subsLayer = new SubscriptionLayer();
let timer=null;


const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });


function appointmentChecker() {
  console.log("✅ checking for appointments...");
  timer = setInterval(async () => {
    await subsLayer.getAllUsers().then((users) => {
      users.forEach(async (user) => {
        console.log(
          "loop over user: ",
          user.data.chat.id,
          "Judet: ",
          judete[user.data.judetId - 1].nume
        );
        //TODO: validate user free trial
        await getDateDRPCIV(user.data.judetId).then(async (date) => {
          // console.log(
          //   "fetched date: " + date + " last date: " + user.data.lastDate
          // );
          if (date !== user.data.lastDate) {
            console.log("new date found: " + date);
            await subsLayer
              .updateUserLastDate(user.data.chat.id, date)
              .then(() => {
                bot.sendMessage(
                  user.data.chat.id,
                  `${date} este noua data disponibila la DRPCIV `
                );
              });
          }
        });
      });
    });
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
  
appointmentChecker();

export default {
    appointmentChecker,
    getDateDRPCIV
};
