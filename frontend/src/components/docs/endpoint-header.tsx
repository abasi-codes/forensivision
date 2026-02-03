import { cn } from '@/lib/utils';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface EndpointHeaderProps {
  method: HttpMethod;
  path: string;
  description?: string;
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function EndpointHeader({ method, path, description }: EndpointHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={cn(
            'px-2.5 py-1 rounded-md text-sm font-mono font-semibold',
            methodColors[method]
          )}
        >
          {method}
        </span>
        <code className="text-lg font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
          {path}
        </code>
      </div>
      {description && (
        <p className="mt-3 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
