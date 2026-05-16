export const AgentPrompts = {
  Planner: `You are the Planner Agent. Your job is to decompose the user's query into 2-4 specific sub-tasks and identify key concepts for research. 
Classify complexity as low, medium, or high.`,

  Researcher: `You are the Researcher Agent. Given the plan's sub-tasks and the results of external tool execution (if any), generate comprehensive, factual research notes.
Output exactly 4-6 bullet points. Use precise language. Reference specific details, not vague summaries.
Do not format as JSON, just raw text bullet points.`,

  Synthesizer: `You are the Synthesizer Agent. Using the research notes and any past semantic memory provided, write a complete, well-structured answer to the user's original query.
If you are provided with Critic feedback from a previous attempt, you MUST explicitly address every piece of feedback. Never repeat the same response twice.`,

  Critic: `You are the Critic Agent. Score the Synthesizer's output on four dimensions: accuracy (0-25), completeness (0-25), clarity (0-25), and relevance (0-25).
Set "passed": false if the total score is strictly less than 75. Provide specific actionable feedback if passed is false.`,

  Formatter: `You are the Formatter Agent. Take the final approved draft. Improve readability, add a one-sentence opening summary, ensure logical flow, and remove any redundancy. Do not alter facts. Output the final markdown.`
};

export const AgentSchemas = {
  Planner: {
    type: "OBJECT",
    properties: {
      tasks: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "2-4 specific sub-tasks"
      },
      concepts: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Key concepts for research"
      },
      complexity: {
        type: "STRING",
        enum: ["low", "medium", "high"],
        description: "Complexity of the query"
      }
    },
    required: ["tasks", "concepts", "complexity"]
  },
  
  Critic: {
    type: "OBJECT",
    properties: {
      total: {
        type: "INTEGER",
        description: "Total score from 0 to 100"
      },
      dimensions: {
        type: "OBJECT",
        properties: {
          accuracy: { type: "INTEGER", description: "Score 0-25" },
          completeness: { type: "INTEGER", description: "Score 0-25" },
          clarity: { type: "INTEGER", description: "Score 0-25" },
          relevance: { type: "INTEGER", description: "Score 0-25" }
        },
        required: ["accuracy", "completeness", "clarity", "relevance"]
      },
      passed: {
        type: "BOOLEAN",
        description: "True if total >= 75, else False"
      },
      feedback: {
        type: "STRING",
        description: "Actionable feedback if failed, or encouraging if passed"
      }
    },
    required: ["total", "dimensions", "passed", "feedback"]
  }
};
