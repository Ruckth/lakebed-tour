export type ToolCall = {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
};

export type ChatMessage =
	| { role: 'system'; content: string }
	| { role: 'user'; content: string }
	| { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
	| { role: 'tool'; content: string; tool_call_id: string };

export type ToolDef = {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, unknown>;
			required?: string[];
		};
	};
};

export type LlmResponse = {
	content: string | null;
	tool_calls?: ToolCall[];
};

export async function callAI(
	apiBase: string,
	apiKey: string,
	model: string,
	messages: ChatMessage[],
	tools: ToolDef[]
): Promise<LlmResponse> {
	const body: {
		model: string;
		messages: ChatMessage[];
		temperature: number;
		max_tokens: number;
		tools?: ToolDef[];
		tool_choice?: 'auto';
	} = {
		model,
		messages,
		temperature: 0.7,
		max_tokens: 500
	};

	if (tools.length > 0) {
		body.tools = tools;
		body.tool_choice = 'auto';
	}

	const res = await fetch(`${apiBase}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const error = await res.text();
		throw new Error(`AI API error (${res.status}): ${error}`);
	}

	const data = await res.json();
	const choice = data.choices?.[0]?.message;

	return {
		content: choice?.content ?? null,
		tool_calls: choice?.tool_calls
	};
}

export function classifyComplexity(message: string): 'simple' | 'complex' {
	const lower = message.toLowerCase();

	const complexPatterns = [
		/compar/i,
		/which.*(better|best|recommend)/i,
		/differ.*between/i,
		/should i/i,
		/help me (choose|decide|pick)/i,
		/multiple.*dates/i,
		/if.*then/i,
		/budget.*plan/i
	];

	if (complexPatterns.some((p) => p.test(lower))) return 'complex';
	return 'simple';
}
