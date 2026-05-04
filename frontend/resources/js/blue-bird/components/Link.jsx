import { useSPA } from "../contexts/SPAContext.jsx";
import { Link as RouterLink } from "react-router-dom";

function Link({ to, children, className = 'text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors', ...props }) {
    const { l } = useSPA();

    const localizedTo = l(to);

    return (
        <RouterLink to={localizedTo} {...props} className={className}>
            {children}
        </RouterLink>
    );
}

export default Link;