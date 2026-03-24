import React from 'react';
import Header from '../components/Header';
import { useLanguage } from '../blue-bird/contexts/LanguageContext';

import Card from '../blue-bird/components/Card';
import Typography from '../blue-bird/components/Typography'

export default function About() {
  const { t } = useLanguage();
  return (
    <div
      className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 min-h-screen"
    >
      <Header />
      <main className='max-w-3xl mx-auto mt-8 p-4'>
        <Card>
          <Typography variant='h1' className='text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4'>
            {t("about_page.title")}
          </Typography>
          <Typography className='text-slate-500 dark:text-slate-400 leading-7'>
            {t("about_page.description")}
          </Typography>
          <div className='mt-8 pt-4 border-t border-slate-200 dark:border-slate-800'>
            <Typography className='text-sm text-red-500 font-medium'>
              {t("about_page.check_your_console")}
            </Typography>
          </div>
        </Card>
      </main>
    </div>
  );
}