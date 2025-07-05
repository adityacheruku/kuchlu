'use server';
/**
 * @fileOverview Generates smart reply suggestions based on chat history.
 *
 * - generateSmartReplies - A function that generates smart reply suggestions.
 * - SmartReplyInput - The input type for the generateSmartReplies function.
 * - SmartReplyOutput - The return type for the generateSmartReplies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartReplyInputSchema = z.object({
  chatHistory: z.string().describe('The recent chat history.'),
});
export type SmartReplyInput = z.infer<typeof SmartReplyInputSchema>;

const SmartReplyOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested replies.'),
});
export type SmartReplyOutput = z.infer<typeof SmartReplyOutputSchema>;

export async function generateSmartReplies(input: SmartReplyInput): Promise<SmartReplyOutput> {
  return generateSmartRepliesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartReplyPrompt',
  input: {schema: SmartReplyInputSchema},
  output: {schema: SmartReplyOutputSchema},
  prompt: `You are a helpful chat assistant that suggests smart replies based on the recent chat history.

  Recent Chat History:
  {{chatHistory}}

  Generate 3 suggested replies that the user can quickly tap to respond. Make them short and relevant to the conversation. Return the replies as a JSON array of strings.
  Do not include any conversational prefixes, such as "Reply:". Only include the reply suggestion.
  Ensure that the replies are appropriate and non-offensive.
  `,
});

const generateSmartRepliesFlow = ai.defineFlow(
  {
    name: 'generateSmartRepliesFlow',
    inputSchema: SmartReplyInputSchema,
    outputSchema: SmartReplyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
