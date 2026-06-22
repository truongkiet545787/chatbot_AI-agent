import React from 'react';
import ProjectBoardClient from '@/app/[locale]/project/board/[slug]/client';
import TranslationsProvider from '@/components/TranslationsProvider';

const i18nNamespaces = ['translation'];

const ProjectBoardPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
	const { locale } = await params;
	return (
		<TranslationsProvider namespaces={i18nNamespaces} locale={locale}>
			<ProjectBoardClient />
		</TranslationsProvider>
	);
};

export default ProjectBoardPage;
