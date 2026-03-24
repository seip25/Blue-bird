import { Link } from "react-router-dom";
import { useState } from "react";
import Button from "../blue-bird/components/Button";
import { useLanguage } from "../blue-bird/contexts/LanguageContext";
import { useTheme } from "../blue-bird/contexts/ThemeContext";

export default function Header() {
    const { t, setLang } = useLanguage();
    const { changeTheme } = useTheme();

    const [emojiTheme, setEmojiTheme] = useState("🌞");

    const changeThemeEmoji = () => {
        if (emojiTheme === "🌞") {
            setEmojiTheme("🌙");
            changeTheme("dark");
        } else {
            setEmojiTheme("🌞");
            changeTheme("light");
        }
    }

    return (
        <header>
            <nav
                className='bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-slate-800 px-4 py-4 flex justify-between items-center gap-4 sticky top-0 z-10'
            >
                <div className='font-bold text-xl text-slate-900 dark:text-slate-100'>
                    Blue Bird
                </div>
                <div className='flex justify-between items-center gap-4'>
                    <div className="flex justify-between items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => setLang("es")} >
                            ES
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setLang("en")} >
                            EN
                        </Button>
                        <Button variant="ghost" size="icon" onClick={changeThemeEmoji}>
                            {emojiTheme}
                        </Button>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                        <Link to="/" className='text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors'>{t("home")}</Link>
                        <Link to="/about" className='text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors'>{t("about")}</Link>
                    </div>

                </div>
            </nav>
        </header>

    )
}