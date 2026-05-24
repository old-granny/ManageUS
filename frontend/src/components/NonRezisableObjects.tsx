import React from 'react';
import type { PlacedComponent, ComponentKind } from '../types';
import { ComponentIcon } from './ComponentIcon';

type CompRendererProps = { comp: PlacedComponent; onStartDrag?: (e: React.MouseEvent, comp: PlacedComponent) => void; showName?: boolean };

export const Light: React.FC<CompRendererProps> = ({ comp, onStartDrag }) => (
	<div
		onMouseDown={(e) => onStartDrag && onStartDrag(e, comp)}
		className="cursor-move transform group-hover:scale-110 transition-transform duration-150 w-full h-full flex items-center justify-center"
		title="Glisser pour déplacer l'équipement"
	>
		<ComponentIcon kind="light" width="100%" height="100%" />
		<span className="comp-name">{comp.name}</span>
	</div>
);

export const Speaker: React.FC<CompRendererProps> = ({ comp, onStartDrag }) => (
	<div onMouseDown={(e) => onStartDrag && onStartDrag(e, comp)} className="cursor-move w-full h-full flex items-center justify-center">
		<ComponentIcon kind="speaker" width="100%" height="100%" />
		<span className="comp-name">{comp.name}</span>
	</div>
);

export const Projector: React.FC<CompRendererProps> = ({ comp, onStartDrag }) => (
	<div onMouseDown={(e) => onStartDrag && onStartDrag(e, comp)} className="cursor-move w-full h-full flex items-center justify-center">
		<ComponentIcon kind="projector" width="100%" height="100%" />
		<span className="comp-name">{comp.name}</span>
	</div>
);

export const Corde: React.FC<CompRendererProps> = ({ comp, onStartDrag }) => (
	<div onMouseDown={(e) => onStartDrag && onStartDrag(e, comp)} className="cursor-move w-full h-full flex items-center justify-center">
		<ComponentIcon kind="corde" width="100%" height="100%" />
		<span className="comp-name">{comp.name}</span>
	</div>
);

export const Flame: React.FC<CompRendererProps> = ({ comp, onStartDrag }) => (
	<div onMouseDown={(e) => onStartDrag && onStartDrag(e, comp)} className="cursor-move w-full h-full flex items-center justify-center">
		<ComponentIcon kind="flame" width="100%" height="100%" />
		<span className="comp-name">{comp.name}</span>
	</div>
);

export const NonResizableComponents: Partial<Record<ComponentKind, React.FC<CompRendererProps>>> = {
	light: Light,
	speaker: Speaker,
	projector: Projector,
	corde: Corde,
	flame: Flame,
};

export default NonResizableComponents;
