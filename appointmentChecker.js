import { SubscriptionLayer } from "./faunadb.js";
const subsLayer = new SubscriptionLayer();
let timer=null;

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

appointmentChecker();
