import React from 'react';
import { TPeriod } from '@/constants/periods.constant';
import Card, { CardBody } from '@/components/ui/Card';
import Icon from '@/components/icon/Icon';
import Tooltip from '@/components/ui/Tooltip';
import Balance from '@/components/Balance';

const Balance1Partial = ({ activeTab }: { activeTab: TPeriod }) => {
	return (
		<Card className='bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500/50 shadow-lg shadow-blue-500/10 h-full !p-0 overflow-hidden'>
			<CardBody className='flex flex-col h-full justify-between p-4'>
				<div className='flex flex-col gap-3 justify-between h-full min-h-[140px]'>
					<div className='flex items-center justify-between'>
						<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/10'>
							<Icon icon='HeroCalendar' size='text-2xl' className='text-white' />
						</div>
						<span className='rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md border border-white/10'>
							Hero KPI
						</span>
					</div>
					<div className='mt-2'>
						<div className='space-x-1 text-blue-100/90 text-xs font-medium rtl:space-x-reverse flex items-center gap-1.5'>
							<span>Period: {activeTab.text} / Sales</span>
							<Tooltip text='Total sales amount.' />
						</div>
						<div className='text-4xl font-bold tracking-tight mt-1 text-white'>238K</div>
					</div>
					<div className='flex items-center justify-between mt-1 pt-2 border-t border-white/15'>
						<Balance status='positive' value='32%' className='!bg-white/10 backdrop-blur-sm border border-white/5 !text-white font-medium'>
							<span className='text-blue-100/80 text-xs font-normal ms-1'>vs last period</span>
						</Balance>
					</div>
				</div>
			</CardBody>
		</Card>
	);
};

export default Balance1Partial;
