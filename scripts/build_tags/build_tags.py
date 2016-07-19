#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
    __author__="Gilbert Montague"
    Super simple way to add build tags to a file
"""
import argparse
import debug_status as ds

verbose = True
delimiter = "/n"


def add(in_file, tag, text):
    """
        Appends text to a file between specified tag
    """
    start_tag = tag + "_START" + '\n'
    end_tag = tag + "_END" + '\n'

    ds.print_status(ds.INFO, "Opening file: %s" % in_file, verbose)

    lines = text.split(delimiter)
    try:
        with open(in_file, 'a') as file:
            file.write(start_tag)
            for line in lines:
                file.write(line + '\n')
            file.write(end_tag)
    except (OSError, IOError) as e:
        ds.print_status(ds.FATAL_ERROR, str(e), verbose=True)
        exit()


def remove(in_file, tag):
    """
        Removes all text between specified tags in a file
    """
    ds.print_status(ds.INFO, "Opening file: %s" % in_file, verbose)
    lines = []

    # Get all of the lines in the file
    try:
        with open(in_file, 'r') as file:
            lines = file.readlines()
    except (OSError, IOError) as e:
        ds.print_status(ds.FATAL_ERROR, str(e), verbose=True)
        exit()

    # And delete the blocked text
    writing = True
    start_tag = tag + "_START" + '\n'
    end_tag = tag + "_END" + '\n'

    try:
        with open(in_file, 'w') as file:
            for line in lines:
                if writing:
                    if start_tag == line:
                        writing = False
                    else:
                        file.write(line)
                elif end_tag == line:
                    writing = True
    except (OSError, IOError) as e:
        ds.print_status(ds.FATAL_ERROR, str(e), verbose)
        exit()

if __name__ == '__main__':

    # Parse command line arguments
    parser = argparse.ArgumentParser()
    # Need a file name
    parser.add_argument('-f', '--file', help='File to edit', required=True)

    # The tag we are operating on
    parser.add_argument(
        '-t', '--tag', help='The tag to operate on', required=True)

    # Should we run this silently?
    parser.add_argument('-v', '--verbose', action='store_true',
                        default=False, required=False, help="Enable debug statements")

    # Subparsers
    subparsers = parser.add_subparsers(dest='subcommand')
    # Add tags?
    parser_add = subparsers.add_parser('add')
    parser_add.add_argument('-t', '--text', help='The text to be inserted')

    # Or remove them
    parser_remove = subparsers.add_parser('remove')
    args = parser.parse_args()

    verbose = args.verbose
    ds.print_status(ds.WARNING, "Debug statements enabled", verbose)

    if args.subcommand == 'add':
        ds.print_status(ds.INFO, "Adding text to file: %s with tag: %s" % (
            args.file, args.tag), verbose)
        text = str(args.text)
        add(args.file, args.tag, text)
    elif args.subcommand == 'remove':
        ds.print_status(ds.INFO, "Removing text from file: %s with tag: %s" % (
            args.file, args.tag), verbose)
        remove(args.file, args.tag)
