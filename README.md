# Rizoom

A lightweight JavaScript library for interactive image zoom with cursor tracking, drag support, and gallery navigation.

## Installation
```
npm install rizoom
```

## Usage

### Basic Setup
```js
import Rizoom from 'rizoom';

// Initialize with image selector
const rizoom = new Rizoom('.my-image');
```

### With Gallery Support
```js
import Rizoom from 'rizoom';

// Initialize with image and gallery selectors
const rizoom = new Rizoom('.my-image', '.gallery-container');
```

### HTML Structure
```html
<!-- Basic image -->
<img src="image.jpg" alt="Description" class="my-image">

<!-- Gallery -->
<div class="gallery-container">
  <img src="image1.jpg" alt="Image 1" class="my-image">
  <img src="image2.jpg" alt="Image 2" class="my-image">
  <img src="image3.jpg" alt="Image 3" class="my-image">
</div>
```

## Options

```js
const rizoom = new Rizoom('img', '.gallery-container', {
  duration: 0.25, // Animation duration in seconds
  
  labels: {
    close: 'Close Zoom',
    buttonNext: 'Next Image',
    buttonPrev: 'Previous Image'
  },
  
  classes: {
    zoom: 'rizoom-zoom',
    wheel: 'rizoom-wheel',
    overlay: 'rizoom-overlay',
    // ... other classes
  }
});
```

## Controls
- **Click** - Open/close zoom
- **Mouse wheel** - Zoom in/out with cursor tracking
- **Drag** - Pan around zoomed image
- **Escape** - Close zoom
- **Enter** - Open/close zoom (when focused)
- **Tab** - Close zoom and continue navigation

## CSS Classes
The library adds these CSS classes that you can style:
- `⁠.rizoom` - Added to all zoomable images
- `⁠.rizoom-zoom` - Added when image is zoomed
- `⁠.rizoom-wheel` - Added when using wheel zoom
- `⁠.rizoom-overlay` - Background overlay
- `⁠.rizoom-button-next` - Next button in gallery
- `⁠.rizoom-button-prev` - Previous button in gallery

## License
MIT
