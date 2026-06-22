import React from 'react';
import ProjectDashboardClient from '@/app/[locale]/project/dashboard/client';
import TranslationsProvider from '@/components/TranslationsProvider';

const i18nNamespaces = ['translation'];
const ProjectDashboardPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
	const { locale } = await params;
	return (
		<TranslationsProvider namespaces={i18nNamespaces} locale={locale}>
			<ProjectDashboardClient />
		</TranslationsProvider>
	);
};

export default ProjectDashboardPage;
