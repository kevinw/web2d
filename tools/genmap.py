import random
import os.path
random.seed(1)

w, h = 100, 50
numtiles = 24#12*10

thisdir = os.path.abspath(os.path.dirname(__file__))
name = os.path.join(thisdir, '..', 'data', 'testmap.json')

def gen():
    m = []
    for y in xrange(h):
        row = []
        for x in xrange(w):
            row.append(random.randint(0, numtiles-1))
        m.append(row)


    open(name, 'wb').write(repr(m))

if __name__ == '__main__':
    gen()
