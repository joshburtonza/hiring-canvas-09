import { Check } from "lucide-react";

interface Task {
  id: string;
  title: string;
  meta: string;
  completed: boolean;
  thumbUrl?: string;
}

interface TasksListProps {
  tasks: Task[];
  progress: number;
}

export function TasksList({ tasks, progress }: TasksListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Onboarding tasks</h3>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {task.thumbUrl ? (
                <img src={task.thumbUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {task.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {task.meta}
              </div>
            </div>
            
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              task.completed 
                ? 'bg-primary text-primary-foreground' 
                : 'border border-border'
            }`}>
              {task.completed && <Check className="w-3 h-3" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}