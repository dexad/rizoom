import "../css/rizoom.css";
import { clamp } from './utils/clamp';

export default class Rizoom {
	constructor(selector, selectorGallery, userOptions = {}) {
		if (!selector) {
			return;
		}

		this.name = 'rizoom';
		this.selector = `${selector}, .${this.name}`;
		this.selectorGallery = selectorGallery;
		this.options = {
			duration: 0.25,
			...userOptions,
			labels: {
				close: 'Close Zoom',
				buttonNext: 'Next Image',
				buttonPrev: 'Previous Image',
				...userOptions.labels,
			},
			classes: {
				zoom: 'rizoom-zoom',
				wheel: 'rizoom-wheel',
				overflow: 'rizoom-overflow',
				overlay: 'rizoom-overlay',
				overlayShow: 'rizoom-overlay-show',
				close: 'rizoom-button-close',
				closeShow: 'rizoom-button-close-show',
				button: 'rizoom-button',
				buttonNext: 'rizoom-button-next',
				buttonPrev: 'rizoom-button-prev',
				buttonShow: 'rizoom-button-show',
				...userOptions.classes,
			},
		};

		// Main state.
		this.image = null;
		this.ui = {
			buttonNext: null,
			buttonPrev: null,
			overlay: null,
			close: null,
		};
		this.body = document.body;

		// Flags.
		this.initialized = false;
		this.zoomed = false;
		this.zoomedTimeout = null;
		this.isWheel = false;
		this.isGallery = false;
		this.isDrag = false;

		// Transform data.
		this.rect = {};
		this.current = { x: 0, y: 0, scale: 0 };
		this.fit = { x: 0, y: 0, scale: 0 };
		this.drag = { startX: 0, startY: 0, x: 0, y: 0 };
		this.cursor = { x: 0, y: 0 };

		// Gallery data.
		this.gallery = {
			init: false,
			images: [],
			hideImages: [],
			cache: new Map(),
		};

		// Viewport cache.
		this.viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		};

		this.init();
	}

	init() {
		document.addEventListener('click', (event) => {
			// return when right mouse click.
			if (event.button !== 0) {
				return;
			}

			// Return when not target or is drag.
			const target = event.target.closest(this.selector);
			if (this.isDrag || !target) {
				return;
			}

			this.zoomed ? this.close(target) : this.open(target);
		});

		// Update images.
		this.update();

		// Create overlay.
		const overlay = this.createUI('overlay');
		overlay.addEventListener('click', () => {
			this.close(this.image);
		});

		// Create close.
		const close = this.createUI('close');
		close.addEventListener('click', () => {
			this.close(this.image);
		});

		// Create buttons for gallery.
		if (this.selectorGallery) {
			const buttonNext = this.createUI('buttonNext');
			const buttonPrev = this.createUI('buttonPrev');

			buttonNext.classList.add(this.options.classes.button);
			buttonPrev.classList.add(this.options.classes.button);

			buttonNext.addEventListener('click', () => {
				this.navigationGallery('next');
			});
			buttonPrev.addEventListener('click', () => {
				this.navigationGallery('prev');
			});
		}

		// Press escape.
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.image) {
				this.close(this.image);
			}
		});

		// Update viewport.
		window.addEventListener('resize', () => {
			this.viewport.width = window.innerWidth;
			this.viewport.height = window.innerHeight;
		});

		// Wheel.
		document.addEventListener('wheel', this.handleWheel.bind(this), {
			passive: false,
		});

		// Drag.
		let timeoutMouseup = null;
		let isMousedown = false;
		document.addEventListener(
			'mousedown',
			(e) => {
				if (!this.isWheel || e.button !== 0) {
					return;
				}

				if (!e.target.closest(this.selector)) {
					return;
				}

				e.preventDefault();
				clearTimeout(timeoutMouseup);

				isMousedown = true;
				this.drag.startX = e.clientX;
				this.drag.startY = e.clientY;
				this.drag.x = this.current.x;
				this.drag.y = this.current.y;
			},
			{ passive: false },
		);

		document.addEventListener('mouseup', (e) => {
			if (isMousedown) {
				isMousedown = false;
				timeoutMouseup = setTimeout(() => {
					this.isDrag = false;
				}, 10);
			}
		});

		document.addEventListener('mousemove', (e) => {
			if (!this.image) {
				return;
			}

			this.cursor.x = e.clientX;
			this.cursor.y = e.clientY;

			// Drag.
			if (isMousedown) {
				const deltaX = e.clientX - this.drag.startX;
				const deltaY = e.clientY - this.drag.startY;

				if (Math.abs(deltaY) > 3 || Math.abs(deltaX) > 3) {
					this.isDrag = true;
				}

				// Update state.
				this.current.x = this.limitPosition(this.drag.x + deltaX, 'width');
				this.current.y = this.limitPosition(this.drag.y + deltaY, 'height');

				// Update style.
				this.image.style.translate = `${this.current.x}px ${this.current.y}px`;
			}
		});
	}

	update() {
		document
			.querySelectorAll(`${this.selector}:not(.${this.name})`)
			.forEach((el) => {
				el.classList.add(this.name);
				el.setAttribute('tabindex', '0');
				el.setAttribute('role', 'img');
				el.setAttribute('aria-label', 'Zoom Image');
				el.setAttribute('aria-expanded', 'false');
				el.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						this.zoomed ? this.close(el) : this.open(el);
					} else if (e.key === 'Tab') {
						this.close(el);
					}
				});
			});
	}

	open(el) {
		this.zoomed = true;
		this.image = el;
		this.calculateFit();
		this.applyTransform();

		if (!el.classList.contains(this.name)) {
			el.classList.add(this.name);
		}

		// Body overflow.
		this.body.classList.add(this.options.classes.overflow);

		// Show overlay.
		this.ui.overlay?.classList.add(this.options.classes.overlayShow);

		// Show buttons.
		const gallery = this.selectorGallery
			? el.closest(this.selectorGallery)
			: false;

		if (gallery) {
			let images;
			if (this.gallery.cache.has(gallery)) {
				images = this.gallery.cache.get(gallery);
			} else {
				images = Array.from(gallery.querySelectorAll(this.selector));
				this.gallery.cache.set(gallery, images);
			}

			this.gallery.images = images;
			this.isGallery = true;
			this.showButtons();
		}

		// Set element.
		clearTimeout(this.zoomedTimeout);

		el.classList.add(this.options.classes.zoom);
		el.setAttribute('aria-expanded', 'true');
	}

	calculateFit() {
		this.rect = this.image.getBoundingClientRect();
		this.fit = this.current = {
			scale: Math.min(
				this.viewport.width / this.rect.width,
				this.viewport.height / this.rect.height,
			),
			x: this.viewport.width / 2 - (this.rect.left + this.rect.width / 2),
			y: this.viewport.height / 2 - (this.rect.top + this.rect.height / 2),
		};
	}

	applyTransform() {
		const { x, y, scale } = this.current;
		this.image.style.scale = scale;
		this.image.style.translate = `${x}px ${y}px`;
	}

	close(el) {
		// Update style.
		el.style.transitionDuration = '';
		el.style.scale = '';
		el.style.translate = '';
		el.classList.remove(this.options.classes.wheel);
		el.setAttribute('aria-expanded', 'false');

		// Body overflow.
		this.body.classList.remove(this.options.classes.overflow);

		// Hide overlay.
		this.ui.overlay?.classList.remove(this.options.classes.overlayShow);

		// Hide buttons.
		this.ui.buttonNext?.classList.remove(this.options.classes.buttonShow);
		this.ui.buttonPrev?.classList.remove(this.options.classes.buttonShow);

		// Remove zoom class.
		this.zoomedTimeout = setTimeout(() => {
			el.classList.remove(this.options.classes.zoom);
		}, this.options.duration * 1000);

		// Update state.
		this.image = null;
		this.zoomed = this.isDrag = this.isWheel = this.isGallery = false;
	}

	handleWheel(e) {
		if (!this.image) {
			return;
		}
		e.preventDefault();

		const scale = clamp(
			this.current.scale * 2 ** (e.wheelDelta * 0.001),
			this.fit.scale,
			this.fit.scale + 2,
		);
		const prevScale = this.current.scale;

		if (scale === prevScale) {
			return;
		}

		// Update state.
		const cursorX = this.cursor.x - this.viewport.width / 2;
		const cursorY = this.cursor.y - this.viewport.height / 2;
		const scaleRatio = scale / prevScale;
		const hasFitZoom = this.fit.scale === scale;
		this.current = {
			scale,
			x: this.limitPosition(
				cursorX -
					(cursorX - (this.current.x - this.fit.x)) * scaleRatio +
					this.fit.x,
				'width',
				scale,
			),
			y: this.limitPosition(
				cursorY -
					(cursorY - (this.current.y - this.fit.y)) * scaleRatio +
					this.fit.y,
				'height',
				scale,
			),
		};
		this.isWheel = !hasFitZoom;

		// Update style.
		this.image.classList.toggle(this.options.classes.wheel, !hasFitZoom);
		this.image.style.transitionDuration = hasFitZoom ? '' : '0s';
		this.applyTransform();
	}

	showButtons() {
		const currentIndex = this.gallery.images.indexOf(this.image);
		this.ui.buttonNext?.classList.toggle(
			this.options.classes.buttonShow,
			currentIndex < this.gallery.images.length - 1,
		);
		this.ui.buttonPrev?.classList.toggle(
			this.options.classes.buttonShow,
			currentIndex > 0,
		);
	}

	getHidePosition(direction) {
		const scaledWidth = this.rect.width * this.current.scale;
		const hideDistance =
			scaledWidth + this.viewport.width / 2 - scaledWidth / 2;
		return direction === 'next'
			? -hideDistance + this.current.x
			: hideDistance + this.current.x;
	}

	navigationGallery(direction) {
		const { image, current } = this;
		const { images, hideImages } = this.gallery;

		const currentIndex = images.indexOf(image);
		const isNext = direction === 'next';
		const nextImage = isNext
			? images[currentIndex + 1]
			: images[currentIndex - 1];

		if (!nextImage) {
			return;
		}

		// Hide current image.
		hideImages.push(image);
		image.style.transitionDuration = '';
		image.style.translate = `${this.getHidePosition(direction)}px ${current.y}px`;
		setTimeout(() => {
			hideImages.forEach((el) => {
				el.classList.remove(this.name, this.options.classes.zoom);
				el.style.transitionDuration = '0s';
				el.style.translate = '';
				el.style.scale = '';
				el.offsetHeight;
				el.style.transitionDuration = '';

				hideImages.shift();
			});
		}, this.options.duration * 1000);

		// Next image.
		this.image = nextImage;
		this.calculateFit();
		this.showButtons();

		nextImage.style.transitionDuration = '0s';
		nextImage.style.translate = `${this.getHidePosition(isNext ? 'prev' : 'next')}px ${current.y}px`;
		nextImage.style.scale = this.current.scale;
		nextImage.classList.add(this.name, this.options.classes.zoom);
		nextImage.offsetHeight;
		nextImage.style.transitionDuration = '';
		nextImage.style.translate = `${this.current.x}px ${this.current.y}px`;
	}

	createUI(name) {
		const element = document.createElement('button');

		if (this.options.labels[name]) {
			element.setAttribute('aria-label', this.options.labels[name]);
		}

		element.classList.add(this.options.classes[name]);
		this.body.appendChild(element);
		this.ui[name] = element;

		return element;
	}

	limitPosition(position, dimension, scale = this.current.scale) {
		const nameAxis = dimension === 'width' ? 'x' : 'y';
		const viewport = this.viewport[dimension];
		const imageSize = this.rect[dimension] * scale;

		// If image is smaller than viewport, keep it centered.
		if (imageSize <= viewport) {
			return this.fit[nameAxis];
		}

		// Calculate bounds to keep image edges within viewport.
		const maxOffset = (imageSize - viewport) / 2;
		const minPosition = this.fit[nameAxis] - maxOffset;
		const maxPosition = this.fit[nameAxis] + maxOffset;

		return clamp(position, minPosition, maxPosition);
	}
}
