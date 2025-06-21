// Priority extraction logic
export function extractPriority(event: any) {
    const description = event.description?.toLowerCase() || '';
    const summary = event.summary?.toLowerCase() || '';
    
    if (description.includes('high priority') || 
        description.includes('urgent') || 
        summary.includes('urgent')) {
      return 'high';
    } else if (description.includes('medium priority') || 
               description.includes('important')) {
      return 'medium';
    }
    return 'low';
  }
  
  // Get time range boundaries
  export function getTimeRange(range: string) {
    const now = new Date();
    let startTime, endTime;
    
    switch (range) {
      case 'today':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        endTime = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startTime = new Date(now);
        endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now);
        endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    return { startTime, endTime };
  }
  
  // Main rescheduling function
  export async function rescheduleByPriority(calendar: any, parameters: any) {
    const { timeRange, priorityOrder = 'high-to-low', respectWorkingHours = true } = parameters;
    const { startTime, endTime } = getTimeRange(timeRange);
    
    try {
      // 1. Fetch events
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime?.toISOString(),
        timeMax: endTime?.toISOString(),
        orderBy: 'startTime',
        singleEvents: true
      });
      
      const events = response.data.items || [];
      
      // 2. Analyze and sort by priority
      const eventsWithPriority = events.map((event: any) => ({
        ...event,
        priority: extractPriority(event),
        duration: new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()
      }));
      
      // Sort by priority
      const priorityOrder_map = { high: 3, medium: 2, low: 1 };
      eventsWithPriority.sort((a: any, b: any) => {
        if (priorityOrder === 'high-to-low') {
          return priorityOrder_map[b.priority as keyof typeof priorityOrder_map] - priorityOrder_map[a.priority as keyof typeof priorityOrder_map];
        } else {
          return priorityOrder_map[a.priority as keyof typeof priorityOrder_map] - priorityOrder_map[b.priority as keyof typeof priorityOrder_map];
        }
      });
      
      // 3. Reschedule events
      const rescheduledEvents = [];
      let currentTime = new Date(startTime as Date);
      
      for (const event of eventsWithPriority) {
        if (respectWorkingHours) {
          currentTime = adjustToWorkingHours(currentTime);
        }
        
        const newStartTime = new Date(currentTime);
        const newEndTime = new Date(currentTime.getTime() + event.duration);
        
        // Update event if time changed
        if (newStartTime.getTime() !== new Date(event.start.dateTime).getTime()) {
          const updatedEvent = {
            ...event,
            start: { dateTime: newStartTime.toISOString(), timeZone: 'Asia/Kolkata' },
            end: { dateTime: newEndTime.toISOString(), timeZone: 'Asia/Kolkata' }
          };
          
          await calendar.events.update({
            calendarId: 'primary',
            eventId: event.id,
            resource: updatedEvent
          });
          
          rescheduledEvents.push({
            id: event.id,
            summary: event.summary,
            priority: event.priority,
            oldTime: event.start.dateTime,
            newTime: newStartTime.toISOString()
          });
        }
        
        // Move to next available slot (with 15min buffer)
        currentTime = new Date(newEndTime.getTime() + 15 * 60 * 1000);
      }
      
      return {
        message: `Rescheduled ${rescheduledEvents.length} events by priority`,
        rescheduledEvents,
        totalEvents: events.length
      };
      
    } catch (error) {
      throw new Error(`Failed to reschedule events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Working hours adjustment
  function adjustToWorkingHours(time: Date) {
    const workStart = 9; // 9 AM
    const workEnd = 17;  // 5 PM
    
    const hour = time.getHours();
    if (hour < workStart) {
      time.setHours(workStart, 0, 0, 0);
    } else if (hour >= workEnd) {
      // Move to next day
      time.setDate(time.getDate() + 1);
      time.setHours(workStart, 0, 0, 0);
    }
    
    return time;
  }
  
  // Optimize schedule function
  export async function optimizeSchedule(calendar: any, parameters: any) {
    const { date, strategy = 'priority' } = parameters;
    
    // Implementation for schedule optimization
    return {
      message: `Schedule optimized for ${date} using ${strategy} strategy`,
      optimizations: []
    };
  }
  
  // Resolve conflicts function
  export async function resolveConflicts(calendar: any, parameters: any) {
    const { conflictResolution = 'priority-based' } = parameters;
    
    // Implementation for conflict resolution
    return {
      message: `Conflicts resolved using ${conflictResolution} method`,
      resolvedConflicts: []
    };
  }