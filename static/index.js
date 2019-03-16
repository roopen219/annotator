var socket = io.connect();

const COLORS = [
    'red',
    'blue',
    'green',
    'cyan',
    'magenta',
    'brown',
    'yellow',
    'orange',
    'purple',
    'violet'
];

let images = [];
let currentImageData;
let currentImageIndex = 0;
let currentImageDimensions;

let currentBoundingBox;
let boundingBoxes = [];

const imageElement = document.getElementById('image');
const guideXElement = document.getElementById('guide_x');
const guideYElement = document.getElementById('guide_y');

function displayImage(image) {
    const imagePath =
        'https://s3.ap-south-1.amazonaws.com/flower-picker/flower/' +
        image.filename;
    imageElement.src = imagePath;
    currentImageData = image;
}

function getNewImage() {
    socket.emit('new_image', {}, function(image) {
        if (image) {
            displayImage(image);
            images.push(image);
            currentImageIndex = images.length - 1;
        }
    });
}

function removeBoundingBoxes() {
    boundingBoxes.forEach((div) => document.body.removeChild(div));
    boundingBoxes = [];
}

function saveImage(cb) {
    if (boundingBoxes.length) {
        const boundingBoxData = boundingBoxes.map(boundingBox => {
            return {
                top: boundingBox.dataset.relativeTop,
                bottom: boundingBox.dataset.relativeBottom,
                right: boundingBox.dataset.relativeRight,
                left: boundingBox.dataset.relativeLeft
            };
        });

        socket.emit(
            'save_image',
            currentImageData._id,
            boundingBoxData,
            cb
        );
    } else {
        cb();
    }
}

function nextImage() {
    if (!images.length) {
        return getNewImage();
    }

    saveImage(() => {
        if (boundingBoxes.length) {
            removeBoundingBoxes();
            if (currentImageIndex === images.length - 1) {
                getNewImage();
            } else {
                currentImageIndex = currentImageIndex + 1;
                getImageForCurrentImageId();
            }
        }
    });
}

function previousImage() {
    if (images.length) {
        if (currentImageIndex) {
            saveImage(() => {
                currentImageIndex = currentImageIndex - 1;
                getImageForCurrentImageId()
            });
        }
    }
}

function getImageForCurrentImageId() {
    removeBoundingBox();
    removeBoundingBoxes();
    socket.emit('get_image', images[currentImageIndex]._id, (imageData) => {
        displayImage(imageData);
        if (!_.isEmpty(imageData.boundingBoxes)) {
            boundingBoxes = imageData.boundingBoxes.map((boundingBox, index) => {
                return createBoundingBox({
                    top: imageElement.getBoundingClientRect().top + parseInt(boundingBox.top),
                    left: imageElement.getBoundingClientRect().left + parseInt(boundingBox.left),
                    relativeTop: parseInt(boundingBox.top),
                    relativeRight: parseInt(boundingBox.right),
                    relativeLeft: parseInt(boundingBox.left),
                    relativeBottom: parseInt(boundingBox.bottom),
                    height: parseInt(boundingBox.bottom) - parseInt(boundingBox.top),
                    width: parseInt(boundingBox.right) - parseInt(boundingBox.left),
                    colorIndex: index % COLORS.length
                });
            });
        }
    });
}

function removeBoundingBox() {
    if(currentBoundingBox) {
        document.body.removeChild(currentBoundingBox);
        return (currentBoundingBox = null);
    }
}

function updateCurrentImageDimensions() {
    currentImageDimensions = {
        height: imageElement.height,
        width: imageElement.width
    };
}

function toggleGuides(show) {
    guideXElement.style.display = show ? 'block' : 'none';
    guideYElement.style.display = show ? 'block' : 'none';
}

function handleImageMouseMove(event) {
    guideXElement.style.top = event.clientY + 'px';
    guideYElement.style.left = event.clientX + 'px';

    toggleGuides(true);

    if (currentBoundingBox) {
        currentBoundingBox.style.height =
            event.clientY - parseInt(currentBoundingBox.dataset.top) + 'px';
        currentBoundingBox.style.width =
            event.clientX - parseInt(currentBoundingBox.dataset.left) + 'px';
    }

    console.log(event.offsetX, event.offsetY);
}

function handleImageMouseLeave() {
    toggleGuides(false);
}

function createBoundingBox({
    top,
    left,
    relativeTop,
    relativeLeft,
    relativeRight,
    relativeBottom,
    height,
    width,
    colorIndex
}) {
    const box = document.createElement('div');
    box.style.top = top + 'px';
    box.style.left = left + 'px';
    box.style.position = 'absolute';
    box.style.pointerEvents = 'none';
    box.style.border = `2px solid ${
         COLORS[colorIndex || boundingBoxes.length % COLORS.length]
    }`;
    box.dataset.top = top;
    box.dataset.left = left;
    box.dataset.relativeTop = relativeTop;
    box.dataset.relativeLeft = relativeLeft;
    box.dataset.relativeRight = relativeRight;
    box.dataset.relativeBottom = relativeBottom;

    box.style.height = (height || 0) + 'px';
    box.style.width = (width || 0) + 'px';

    document.body.appendChild(box);
    return box;
}

function handleImageClick(event) {
    if (!currentBoundingBox) {
        currentBoundingBox = createBoundingBox({
            top: event.clientY,
            left: event.clientX,
            relativeTop: event.offsetY,
            relativeLeft: event.offsetX
        });
    } else {
        if (
            !currentBoundingBox.style.height ||
            !currentBoundingBox.style.width ||
            currentBoundingBox.style.height === '0px' ||
            currentBoundingBox.style.width === '0px'
        ) {
            return removeBoundingBox();
        }

        currentBoundingBox.dataset.relativeBottom = event.offsetY;
        currentBoundingBox.dataset.relativeRight = event.offsetX;

        const box = currentBoundingBox.cloneNode();
        document.body.appendChild(box);
        boundingBoxes.push(box);

        removeBoundingBox();
    }
}

function removeLastBoundingBox() {
    document.body.removeChild(_.last(boundingBoxes));
    boundingBoxes = _.dropRight(boundingBoxes);
}

hotkeys('a', previousImage);
hotkeys('d', nextImage);
hotkeys('r', removeLastBoundingBox);
hotkeys('esc', removeBoundingBox);

imageElement.addEventListener('load', updateCurrentImageDimensions);
imageElement.addEventListener('click', handleImageClick);
imageElement.addEventListener('mousemove', handleImageMouseMove);
imageElement.addEventListener('mouseleave', handleImageMouseLeave);

getNewImage();