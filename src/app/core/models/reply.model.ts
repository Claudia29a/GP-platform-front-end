/** The GP's reply to a question, from the Messaging Service. */
export interface Reply {
  id: string;
  questionId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export const MAX_REPLY_LENGTH = 2000;
