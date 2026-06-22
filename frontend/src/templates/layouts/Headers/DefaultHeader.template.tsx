import React from 'react';
import Header, { HeaderLeft, HeaderRight } from '../../../components/layouts/Header/Header';
import DefaultHeaderRightCommon from './_common/DefaultHeaderRight.common';
import SearchPartial from './_partial/Search.partial';

const DefaultHeaderTemplate = () => {
	return (
		<Header>
			<HeaderLeft />
			<HeaderRight />
		</Header>
	);
};

export default DefaultHeaderTemplate;
