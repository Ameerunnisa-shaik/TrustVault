import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-vault-surface rounded-2xl border border-vault-border/80 shadow-soft">
      <div className="w-14 h-14 rounded-2xl bg-beige-100 flex items-center justify-center text-vault-accent mb-4 border border-beige-200">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-vault-text tracking-tight">{title}</h3>
      <p className="text-sm text-vault-muted max-w-sm mt-1.5 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 bg-vault-accent hover:bg-vault-accentHover text-white text-sm font-medium rounded-xl shadow-sm transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
