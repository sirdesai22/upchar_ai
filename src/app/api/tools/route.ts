// App Router: /app/api/tools/route.js
export async function GET() {
    const tools = [
      {
        name: "rescheduleByPriority",
        description: "Reschedule events based on priority levels",
        parameters: {
          type: "object",
          properties: {
            timeRange: {
              type: "string",
              description: "Time range (today, week, month)",
              enum: ["today", "week", "month"]
            },
            priorityOrder: {
              type: "string", 
              description: "Priority order (high-to-low, low-to-high)",
              enum: ["high-to-low", "low-to-high"]
            },
            respectWorkingHours: {
              type: "boolean",
              description: "Keep events within working hours"
            }
          },
          required: ["timeRange"]
        }
      },
      {
        name: "optimizeSchedule",
        description: "Optimize entire schedule for efficiency",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date to optimize (YYYY-MM-DD)"
            },
            strategy: {
              type: "string",
              enum: ["priority", "time-blocks", "minimize-gaps"],
              description: "Optimization strategy"
            }
          },
          required: ["date"]
        }
      },
      {
        name: "resolveConflicts",
        description: "Resolve scheduling conflicts automatically",
        parameters: {
          type: "object",
          properties: {
            conflictResolution: {
              type: "string",
              enum: ["priority-based", "first-come-first-serve", "shortest-first"],
              description: "How to resolve conflicts"
            }
          }
        }
      }
    ];
  
    return Response.json({ tools });
  }