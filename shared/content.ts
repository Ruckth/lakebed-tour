export type PrivateNote = {
  id: string;
  body: string;
  done: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type GuestbookEntry = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPicture: string;
  createdAt: string;
  updatedAt: string;
};

export type RuntimeStatus = {
  ok: boolean;
  app: string;
  authUserId: string;
  authDisplayName: string;
  mode: "lakebed";
};

export function cleanBody(value: string, maxLength = 220): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
