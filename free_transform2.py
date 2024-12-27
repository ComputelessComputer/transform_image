import cv2
import numpy as np
import time

# Initialize global variables
selected_point = None
image = None
image_copy = None
points = []

def on_mouse(event, x, y, flags, param):
    global selected_point, points

    if event == cv2.EVENT_LBUTTONDOWN:
        # Check if click is close to a point
        for i, (px, py) in enumerate(points):
            if abs(x - px) < 50 and abs(y - py) < 50:
                selected_point = i
                break

    elif event == cv2.EVENT_MOUSEMOVE and selected_point is not None:
        # Dragging the selected point
        points[selected_point] = (x, y)
        redraw()
        warp_perspective()

    elif event == cv2.EVENT_LBUTTONUP:
        # Release the selected point
        selected_point = None

def redraw():
    """ Redraw the image with the updated points."""
    global image, image_copy, points
    image_copy = image.copy()
    for point in points:
        cv2.circle(image_copy, point, 30, (0, 0, 255), -1)
    cv2.imshow("Draggable Corners", image_copy)

def warp_perspective():
    """ Fit the image into the quadrilateral formed by the current points."""
    global image, points

    # Define the target points as the current draggable points
    target_points = np.array(points, dtype=np.float32)

    # Define the source rectangle corresponding to the full image
    h, w, _ = image.shape
    src_points = np.array([
        [0, 0],
        [w - 1, 0],
        [w - 1, h - 1],
        [0, h - 1]
    ], dtype=np.float32)

    start_time = time.time()

    # Compute the perspective transform matrix
    matrix = cv2.getPerspectiveTransform(src_points, target_points)

    # Perform the warp perspective
    warped_image = cv2.warpPerspective(image, matrix, (image.shape[1], image.shape[0]))

    print("Time taken for warp perspective: {:.2f} ms".format((time.time() - start_time) * 1000))

    # Draw the red dots on the warped image
    for point in points:
        cv2.circle(warped_image, point, 30, (0, 0, 255), -1)

    # Display the warped image in the same window
    cv2.imshow("Draggable Corners", warped_image)

# Main function
def main():
    global image, image_copy, points

    # Load the image
    image_path = "test.png"  # Change to your image path
    image = cv2.imread(image_path)

    if image is None:
        print("Error: Could not load image.")
        return

    # Initialize corner points
    h, w, _ = image.shape
    points = [(0, 0), (w - 1, 0), (w - 1, h - 1), (0, h - 1)]

    # Create a copy of the image
    image_copy = image.copy()

    # Set up the OpenCV window
    cv2.namedWindow("Draggable Corners")
    cv2.setMouseCallback("Draggable Corners", on_mouse)

    # Draw initial points
    redraw()

    # Display the image and wait for the user to quit
    while True:
        key = cv2.waitKey(1)
        if key == 27:  # ESC key to exit
            break

    # Cleanup
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
