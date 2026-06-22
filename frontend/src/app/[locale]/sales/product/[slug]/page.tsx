import React from 'react';
import ProductPageClient from '@/app/[locale]/sales/product/[slug]/client';

const ProductPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
	const resolvedParams = await params;
	return <ProductPageClient params={resolvedParams} />;
};

export default ProductPage;
