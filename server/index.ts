import { boolean, capsule, endpoint, json, mutation, query, string, table } from "lakebed/server";
import { cleanBody } from "../shared/content";

export default capsule({
  name: "lakebed-tour",

  schema: {
    privateNotes: table({
      body: string(),
      done: boolean().default(false),
      ownerId: string()
    }),
    guestbookEntries: table({
      body: string(),
      authorId: string(),
      authorName: string(),
      authorPicture: string()
    })
  },

  queries: {
    privateNotes: query((ctx) =>
      ctx.db.privateNotes
        .where("ownerId", ctx.auth.userId)
        .orderBy("createdAt", "desc")
        .all()
    ),
    guestbookEntries: query((ctx) =>
      ctx.db.guestbookEntries.orderBy("createdAt", "desc").limit(50).all()
    ),
    runtimeStatus: query((ctx) => ({
      ok: true,
      app: "lakebed-tour",
      authUserId: ctx.auth.userId,
      authDisplayName: ctx.auth.displayName,
      mode: "lakebed"
    }))
  },

  mutations: {
    addPrivateNote: mutation((ctx, body: string) => {
      const clean = cleanBody(body);
      if (!clean) {
        return;
      }

      ctx.db.privateNotes.insert({
        body: clean,
        ownerId: ctx.auth.userId
      });
    }),
    setPrivateNoteDone: mutation((ctx, id: string, done: boolean) => {
      const note = ctx.db.privateNotes.get(id);
      if (!note || note.ownerId !== ctx.auth.userId) {
        return;
      }

      ctx.db.privateNotes.update(id, { done });
    }),
    deletePrivateNote: mutation((ctx, id: string) => {
      const note = ctx.db.privateNotes.get(id);
      if (!note || note.ownerId !== ctx.auth.userId) {
        return;
      }

      ctx.db.privateNotes.delete(id);
    }),
    signGuestbook: mutation((ctx, body: string) => {
      const clean = cleanBody(body, 280);
      if (!clean) {
        return;
      }

      ctx.db.guestbookEntries.insert({
        body: clean,
        authorId: ctx.auth.userId,
        authorName: ctx.auth.displayName,
        authorPicture: ctx.auth.picture ?? ""
      });
    })
  },

  endpoints: {
    status: endpoint({ method: "GET", path: "/api/status" }, (ctx) =>
      json({
        ok: true,
        app: "lakebed-tour",
        authUserId: ctx.auth.userId,
        authDisplayName: ctx.auth.displayName,
        mode: "lakebed"
      })
    )
  }
});
