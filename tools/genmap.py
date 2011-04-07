import os.path
import json
import random
random.seed(1)

w, h = 100, 50
numtiles = 24#12*10
num_layers = 5

thisdir = os.path.abspath(os.path.dirname(__file__))
name = os.path.normpath(os.path.join(thisdir, '..', 'data', 'testmap.json'))

def gen():
    map = []

    for layern in xrange(num_layers):
        distance = (layern+1)**2
        tiles = []
        for y in xrange(h):
            row = []
            for x in xrange(w):
                if random.randint(0,4) == 0:
                    tile = random.randint(1, numtiles-1)
                else:
                    tile = 0
                row.append(tile)
            tiles.append(row)

        map.append(dict(tiles=tiles,
                        distance=distance))

    map.reverse()

    json_output = json.dumps(map, sort_keys=True, indent=2)
    open(name, 'wb').write(json_output)
    print 'wrote %d bytes to %s' % (len(json_output), name)

if __name__ == '__main__':
    gen()

