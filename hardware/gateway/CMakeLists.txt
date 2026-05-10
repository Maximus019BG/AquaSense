
cmake_minimum_required(VERSION 3.10)
project(aquasense_gateway)

set(CMAKE_CXX_STANDARD 17)

option(SERIAL_DEVICE "/dev/ttyUSB0" "Serial device for LoRa bridge")

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../shared/include)

find_package(CURL REQUIRED)
include_directories(${CURL_INCLUDE_DIRS})

file(GLOB SRC_FILES ${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp)

add_executable(gateway ${SRC_FILES})
target_link_libraries(gateway ${CURL_LIBRARIES})

enable_testing()
add_executable(test_protocol tests/test_protocol.cpp ../shared/src/protocol.cpp)
add_test(NAME protocol_test COMMAND test_protocol)
