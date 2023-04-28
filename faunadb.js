import { default as faunadb } from "faunadb";
export class SubscriptionLayer {
  client;

  constructor() {
    this.client = new faunadb.Client({ secret: process.env.FAUNA_KEY });
    this.collection = "subscribers";
    this.q = faunadb.query;
  }

  async getAllUsers() {
    try {
      const result = await this.client.query(
        faunadb.query.Map(
          faunadb.query.Paginate(
            faunadb.query.Documents(faunadb.query.Collection(this.collection))
          ),
          faunadb.query.Lambda((x) => faunadb.query.Get(x))
        )
      );
      return result.data;
    } catch (error) {
      console.log("Error retrieving users: " + error);
    }
  }

  async addUser(chat, lastDate, judetId) {
    try {
      const user = {
        chat: chat,
        lastDate: lastDate,
        judetId: judetId,
        subscribed: true,
        freetrial: {
          status: false,
          endtime: "12.12.1999",
        },
      };
      const result = await this.client.query(
        faunadb.query.Create(faunadb.query.Collection(this.collection), {
          data: user,
        })
      );
      return result?.ref?.data;
    } catch (error) {
      console.log("Error: ", error);
    }
  }
  async updateUserLastDate(chatId, lastDate) {
    try {
      const user = await this.client.query(
        this.q.Get(this.q.Match(this.q.Index("chatId"), chatId))
      );
      if (user) {
        await this.client.query(
          this.q.Update(user.ref, { data: { lastDate: lastDate } })
        );
        console.log(`User with chatId ${chatId} updated successfully`);
      } else {
        console.log(`User with chatId ${chatId} not found`);
      }
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }

  async updateUserJudetId(chatId, judetId) {
    try {
      const user = await this.client.query(
        this.q.Get(this.q.Match(this.q.Index("chatId"), chatId))
      );
      if (user) {
        await this.client.query(
          this.q.Update(user.ref, { data: { judetId: judetId } })
        );
        console.log(`User with chatId ${chatId} updated successfully`);
      } else {
        console.log(`User with chatId ${chatId} not found`);
      }
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }

  async deleteUser(chatId) {
    try {
      const { ref } = await this.client.query(
        this.q.Let(
          { userRef: this.q.Match(this.q.Index("chatId"), chatId) },
          this.q.Delete(this.q.Select("ref", this.q.Get(this.q.Var("userRef"))))
        )
      );
      console.log(`User with chat ID ${chatId} deleted successfully`);
    } catch (error) {
      console.log(`Error deleting user with chat ID ${chatId}: `, error);
    }
  }

  async getUser(chatId) {
    try {
      let resp;
      await this.getAllUsers().then((users) => {
        if (users.length > 0) {
          users.forEach((user) => {
            if (user.data.chat?.id == chatId) {
              resp = user.data;
            }
          });
        }
      });
      return resp;
    } catch (error) {
      console.log("Error: ", error);
    }
  }

  /*
  async deleteAllUsers() {
    try {
      const result = await this.client.query(
        faunadb.query.Map(
          faunadb.query.Paginate(
            faunadb.query.Documents(faunadb.query.Collection(this.collection))
          ),
          faunadb.query.Lambda((x) => faunadb.query.Delete(x))
        )
      );
      return result.data;
    } catch (error) {
      console.log("Error deleting users: " + error);
    }
  }
  */
}
