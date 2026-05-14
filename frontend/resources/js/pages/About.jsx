import React from 'react';
import Header from '../components/Header';
import { useLanguage } from '../blue-bird/contexts/LanguageContext';

import Card from '../blue-bird/components/Card';
import Typography from '../blue-bird/components/Typography'
import { useSPA } from '../blue-bird/contexts/SPAContext.jsx';

export default function About() {
  const { t } = useLanguage();
  const { navigateToLang, pageProps, pageMeta } = useSPA();
  console.log("pageProps", pageProps);
  console.log("pageMeta", pageMeta);
  return (
    <div
      className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 min-h-screen"
    >
      <Header />
      <main className='max-w-3xl mx-auto mt-8 p-4'>
        <Card>
          <Typography variant='h1' className='text-4xl mb-4' gradient={{ from: 'sky', to: 'indigo' }}>
            {t("about_page.title")}
          </Typography>
          <Typography className='text-slate-500 dark:text-slate-400 leading-7'>
            {t("about_page.description")}
          </Typography>
          <div className='mt-8 pt-4 px-4 bg-red-50 text-red-900 rounded-md py-4 rounded-lg text-center'>
            <Typography className='text-sm text-red-500 font-medium'>
              {t("about_page.check_your_console")}
            </Typography>
          </div>
        </Card>
      </main>
    </div>
  );
}