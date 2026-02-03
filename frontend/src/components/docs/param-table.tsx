import { cn } from '@/lib/utils';

interface Parameter {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  default?: string;
}

interface ParamTableProps {
  title?: string;
  parameters: Parameter[];
  className?: string;
}

export function ParamTable({ title, parameters, className }: ParamTableProps) {
  return (
    <div className={cn('my-6', className)}>
      {title && (
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </h4>
      )}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-left py-3 px-4 font-medium">Parameter</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-left py-3 px-4 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {parameters.map((param) => (
              <tr key={param.name} className="bg-white dark:bg-slate-900">
                <td className="py-3 px-4 align-top">
                  <code className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {param.name}
                  </code>
                  {param.required && (
                    <span className="ml-2 text-xs text-red-500 font-medium">required</span>
                  )}
                </td>
                <td className="py-3 px-4 align-top">
                  <code className="font-mono text-sm text-muted-foreground">
                    {param.type}
                  </code>
                </td>
                <td className="py-3 px-4 align-top">
                  <p className="text-muted-foreground">{param.description}</p>
                  {param.default && (
                    <p className="mt-1 text-xs">
                      <span className="text-muted-foreground">Default:</span>{' '}
                      <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                        {param.default}
                      </code>
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
