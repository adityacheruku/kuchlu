"use client";

export const PasswordStrengthIndicator = ({ strength }: { strength: number }) => {
    const levels = [{ color: 'bg-red-500' }, { color: 'bg-red-500' }, { color: 'bg-yellow-500' }, { color: 'bg-green-500' }, { color: 'bg-green-500' }];
    return (
        <div className="flex gap-2 mt-1">
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-1 flex-1 rounded-full bg-muted">
                    {strength > index && <div className={`h-1 rounded-full ${levels[index].color}`} />}
                </div>
            ))}
        </div>
    );
};
