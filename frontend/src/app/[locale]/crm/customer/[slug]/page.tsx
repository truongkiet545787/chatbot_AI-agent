import React from 'react';
import CustomerClient from '@/app/[locale]/crm/customer/[slug]/client';
import TranslationsProvider from '@/components/TranslationsProvider';

const i18nNamespaces = ['translation'];

const CustomerPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
	const { locale } = await params;
	return (
		<TranslationsProvider namespaces={i18nNamespaces} locale={locale}>
			<CustomerClient />
		</TranslationsProvider>
	);
};

export default CustomerPage;
