import React from 'react';
import Head from 'next/head';

export default function SEOHead({ 
  title = "CounselWeb - AI College Recommendations", 
  description = "Discover the best engineering colleges with AI-powered, personalized recommendations based on placement data, fees, and rankings.",
  canonicalUrl = "https://counselweb.com",
  ogImage = "https://counselweb.com/og-image.jpg"
}) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* OpenGraph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Viewport & Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Head>
  );
}
