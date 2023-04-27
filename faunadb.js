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

  async deleteUser(userRef) {
    try {
      const result = await this.client.query(faunadb.query.Delete(userRef));
      return result.ref.data;
    } catch (error) {
      console.log("Error: ", error);
    }
  }

  async deleteUser(user) {
    try {
      const userRef = this.client.query(
        faunadb.query.Map(
          faunadb.Paginate(
            faunadb.Match(faunadb.Index("chat_id"), user.chat.id)
          ),
          faunadb.query.Lambda(
            this.collection,
            faunadb.Get(faunadb.Var(this.collection))
          )
        )
      );
      console.log("User ref: " + userRef);
      const userExists = await this.client.query(faunadb.query.Exists(userRef));

      if (!userExists) {
        console.log(
          `User ${user.chat.first_name} with chat id ${user.chat.id} does not exist in the database.`
        );
        return;
      }

      const response = await this.client.query(faunadb.query.Delete(userRef));
      console.log(
        `User ${user.chat.first_name} with chat id ${user.chat.id} has been deleted from the database.`
      );
      return response;
    } catch (error) {
      console.log("Error deleting user: ", error);
    }
  }

  async deleteUserByIndex(indexName, indexValue) {
    try {
      const result = await client.query(
        faunadb.query.Delete(
          faunadb.query.Match(faunadb.query.Index(indexName), indexValue)
        )
      );
      console.log("User deleted: " + result?.ref?.id);
    } catch (error) {
      console.log("Error deleting user: " + error);
    }
  }

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
}
